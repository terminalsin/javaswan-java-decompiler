plugins {
    id("com.roscopeco.jasm") version "0.7.0"
}

repositories {
    mavenCentral()
}

jasm {
    sourceDir = file("jasm-sources")
    outputDir = file("classes")
}
