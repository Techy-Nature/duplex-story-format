package io.github.techynature.storyapp

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader

/**
 * Shows the compiled story (assets/story/index.html) full screen.
 *
 * The story is served from https://appassets.androidplatform.net/assets/story/
 * rather than file://, so saves (localStorage) and installed mods (IndexedDB)
 * work exactly as they do in a browser, and relative links to images or audio
 * placed next to the story keep working.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader

    // "Import" buttons in the story open Android's file picker through this.
    private var pendingFilePick: ValueCallback<Array<Uri>>? = null
    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        pendingFilePick?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        pendingFilePick = null
    }

    // "Export" buttons in the story save a file through this.
    private var pendingSaveBytes: ByteArray? = null
    private var pendingSaveMime: String = "application/json"
    private val saveFile = registerForActivityResult(
        object : ActivityResultContracts.CreateDocument("*/*") {
            override fun createIntent(context: android.content.Context, input: String): Intent =
                super.createIntent(context, input).setType(pendingSaveMime)
        }
    ) { uri ->
        val bytes = pendingSaveBytes
        pendingSaveBytes = null
        if (uri == null || bytes == null) return@registerForActivityResult
        try {
            contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
            Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
        } catch (error: Exception) {
            Toast.makeText(this, "Could not save: ${error.message}", Toast.LENGTH_LONG).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val background = ContextCompat.getColor(this, R.color.story_background)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(background)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            settings.textZoom = 100
            webViewClient = StoryClient()
            webChromeClient = StoryChromeClient()
            addJavascriptInterface(Bridge(), "StoryApp")
        }

        // Keep the story clear of the status bar, navigation bar and keyboard.
        val root = FrameLayout(this).apply {
            setBackgroundColor(background)
            addView(
                webView,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime()
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)
        window.decorView.setBackgroundColor(background)

        // Back leaves the story running in the background instead of closing it,
        // so an accidental press never loses your place.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else moveTaskToBack(true)
            }
        })

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(STORY_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private inner class StoryClient : WebViewClient() {
        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest
        ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

        // Links inside the story stay in the app; links to websites open in the browser.
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url
            if (url.host == STORY_HOST) return false
            if (url.scheme == "blob" || url.scheme == "data" || url.scheme == "javascript") return false
            try {
                startActivity(Intent(Intent.ACTION_VIEW, url))
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(this@MainActivity, "No app can open $url", Toast.LENGTH_LONG).show()
            }
            return true
        }

        override fun onPageFinished(view: WebView, url: String) {
            view.evaluateJavascript(DOWNLOAD_HOOK, null)
        }
    }

    private inner class StoryChromeClient : WebChromeClient() {
        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams
        ): Boolean {
            pendingFilePick?.onReceiveValue(null)
            pendingFilePick = filePathCallback
            // Many phones label .json files as plain binary, so allow any file.
            try {
                pickFile.launch(arrayOf("*/*"))
            } catch (_: ActivityNotFoundException) {
                pendingFilePick = null
                return false
            }
            return true
        }
    }

    /** Called from DOWNLOAD_HOOK when the story tries to download a file. */
    private inner class Bridge {
        @JavascriptInterface
        fun save(base64: String, fileName: String, mimeType: String) {
            val bytes = try {
                Base64.decode(base64, Base64.DEFAULT)
            } catch (_: IllegalArgumentException) {
                return
            }
            runOnUiThread {
                pendingSaveBytes = bytes
                pendingSaveMime = mimeType.ifBlank { "application/octet-stream" }
                saveFile.launch(fileName.ifBlank { "story-save.json" })
            }
        }
    }

    companion object {
        private const val STORY_HOST = "appassets.androidplatform.net"
        private const val STORY_URL = "https://$STORY_HOST/assets/story/index.html"

        /**
         * WebView ignores <a download> links, which is how stories export saves.
         * This keeps track of the files the page creates and hands them to the
         * app when such a link is clicked, so Android's "Save to" screen opens.
         */
        private val DOWNLOAD_HOOK = """
            (function () {
              if (window.__storyAppHooked) return;
              window.__storyAppHooked = true;
              var blobs = {};
              var create = URL.createObjectURL.bind(URL);
              URL.createObjectURL = function (object) {
                var url = create(object);
                if (object instanceof Blob) blobs[url] = object;
                return url;
              };
              function send(blob, name) {
                var reader = new FileReader();
                reader.onload = function () {
                  var text = String(reader.result);
                  StoryApp.save(text.slice(text.indexOf(',') + 1), name || 'download', blob.type || '');
                };
                reader.readAsDataURL(blob);
              }
              var click = HTMLAnchorElement.prototype.click;
              HTMLAnchorElement.prototype.click = function () {
                var href = this.href || '';
                if (this.hasAttribute('download') && blobs[href]) {
                  send(blobs[href], this.getAttribute('download'));
                  return;
                }
                if (this.hasAttribute('download') && href.indexOf('data:') === 0) {
                  var name = this.getAttribute('download');
                  fetch(href).then(function (r) { return r.blob(); }).then(function (b) { send(b, name); });
                  return;
                }
                return click.apply(this, arguments);
              };
            })();
        """.trimIndent()
    }
}
