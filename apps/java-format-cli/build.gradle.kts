plugins {
    java
    application
    id("com.gradleup.shadow") version "8.3.8"
}

group = "com.blackswan"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.palantir.javaformat:palantir-java-format:2.89.0")
}

application {
    mainClass = "com.blackswan.format.Main"
}

tasks.shadowJar {
    archiveBaseName = "java-format-cli"
    archiveClassifier = ""
    archiveVersion = ""
    manifest {
        attributes["Main-Class"] = "com.blackswan.format.Main"
    }
}

tasks.build {
    dependsOn(tasks.shadowJar)
}
