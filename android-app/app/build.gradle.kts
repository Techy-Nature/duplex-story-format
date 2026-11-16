plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Everything story-specific comes from environment variables, which the
// story-app workflow sets from the inputs in your story repo's workflow file.
fun setting(name: String, fallback: String): String =
    System.getenv(name)?.takeIf { it.isNotBlank() } ?: fallback

val appName = setting("STORY_APP_NAME", "Duplex Story")
val appId = setting("STORY_APP_ID", "io.github.techynature.duplexstory")
val buildNumber = setting("STORY_BUILD_NUMBER", setting("GITHUB_RUN_NUMBER", "1")).toInt()
val versionPrefix = setting("STORY_VERSION_PREFIX", "1.0")
val hasCustomIcon = file("src/main/res/drawable-nodpi/ic_story_icon.png").exists()

android {
    namespace = "io.github.techynature.storyapp"
    compileSdk = 35

    defaultConfig {
        applicationId = appId
        minSdk = 26
        targetSdk = 35
        versionCode = buildNumber
        versionName = "$versionPrefix.$buildNumber"
        resValue("string", "app_name", appName)
        manifestPlaceholders["appIcon"] =
            if (hasCustomIcon) "@drawable/ic_story_icon" else "@mipmap/ic_launcher"
    }

    signingConfigs {
        create("release") {
            // A private key can be passed in through repository secrets (see APP-GUIDE.md).
            // Without one, the bundled public key is used so each build can update the last.
            val customStore = System.getenv("STORY_KEYSTORE_FILE")
            if (!customStore.isNullOrBlank()) {
                storeFile = file(customStore)
                storePassword = System.getenv("STORY_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("STORY_KEY_ALIAS")
                keyPassword = System.getenv("STORY_KEY_PASSWORD")
            } else {
                storeFile = file("story-public.keystore")
                storePassword = "duplexapp"
                keyAlias = "duplexapp"
                keyPassword = "duplexapp"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}

// Stop early with a clear message if the story was not compiled into the app.
tasks.named("preBuild") {
    doFirst {
        val story = file("src/main/assets/story/index.html")
        if (!story.exists()) {
            throw GradleException(
                "No story found at app/src/main/assets/story/index.html. " +
                    "Compile your story with Tweego into that file first (the story-app workflow does this for you)."
            )
        }
    }
}
