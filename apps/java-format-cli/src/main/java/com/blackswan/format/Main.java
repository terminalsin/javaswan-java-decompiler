package com.blackswan.format;

import com.palantir.javaformat.java.Formatter;
import com.palantir.javaformat.java.FormatterException;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public final class Main {

    private static final String[] REQUIRED_ADD_EXPORTS = {
            "--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.processing=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED",
            "--add-opens=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED",
            "--add-opens=jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED",
    };

    public static void main(String[] args) throws Exception {
        Args parsed = parseArgs(args);

        if (parsed.help) {
            printUsage();
            System.exit(0);
        }

        // Re-launch with --add-exports flags required by Palantir Java Format
        if (System.getenv("_JAVA_FORMAT_RELAUNCHED") == null) {
            relaunchWithExports(args);
            return;
        }

        Formatter formatter = Formatter.create();
        List<Result> results = new ArrayList<>();

        if (parsed.files.isEmpty()) {
            String source = readStdin();
            results.add(process("<stdin>", source, parsed, formatter));
        } else {
            for (String filePath : parsed.files) {
                try {
                    String source = Files.readString(Path.of(filePath), StandardCharsets.UTF_8);
                    results.add(process(filePath, source, parsed, formatter));
                } catch (IOException e) {
                    results.add(new Result(filePath, null, "IO error: " + e.getMessage()));
                }
            }
        }

        boolean hasErrors = false;
        for (Result result : results) {
            if (result.error != null) {
                System.err.println("ERROR [" + result.path + "]: " + result.error);
                hasErrors = true;
                continue;
            }
            System.out.print(result.formatted);
        }

        System.exit(hasErrors ? 1 : 0);
    }

    private static void relaunchWithExports(String[] originalArgs) throws Exception {
        String javaCmd = ProcessHandle.current().info().command().orElse("java");
        String jarPath = Main.class.getProtectionDomain()
                .getCodeSource().getLocation().toURI().getPath();

        List<String> cmd = new ArrayList<>();
        cmd.add(javaCmd);
        cmd.addAll(List.of(REQUIRED_ADD_EXPORTS));
        cmd.add("-jar");
        cmd.add(jarPath);
        cmd.addAll(List.of(originalArgs));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.environment().put("_JAVA_FORMAT_RELAUNCHED", "1");
        pb.inheritIO();
        Process process = pb.start();
        System.exit(process.waitFor());
    }

    private static Result process(String path, String source, Args args, Formatter formatter) {
        try {
            String processed = source;

            if (!args.formatOnly) {
                processed = CommentStripper.strip(processed);
            }

            if (!args.stripOnly) {
                processed = formatter.formatSource(processed);
            }

            return new Result(path, processed, null);
        } catch (FormatterException e) {
            return new Result(path, null, "Format error: " + e.getMessage());
        }
    }

    private static String readStdin() {
        try {
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(System.in, StandardCharsets.UTF_8));
            char[] buf = new char[8192];
            int n;
            while ((n = reader.read(buf)) != -1) {
                sb.append(buf, 0, n);
            }
            return sb.toString();
        } catch (IOException e) {
            System.err.println("Error reading stdin: " + e.getMessage());
            System.exit(2);
            return "";
        }
    }

    private static Args parseArgs(String[] args) {
        Args parsed = new Args();
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--help", "-h" -> parsed.help = true;
                case "--strip-only" -> parsed.stripOnly = true;
                case "--format-only" -> parsed.formatOnly = true;
                default -> {
                    if (args[i].startsWith("-")) {
                        System.err.println("Unknown option: " + args[i]);
                        System.exit(2);
                    }
                    parsed.files.add(args[i]);
                }
            }
        }
        return parsed;
    }

    private static void printUsage() {
        System.out.println("""
                Usage: java -jar java-format-cli.jar [OPTIONS] [FILES...]

                Strips comments and formats Java source code using Palantir Java Format.
                If no files are given, reads from stdin.

                Options:
                  --strip-only    Only strip comments, skip formatting
                  --format-only   Only format, skip comment stripping
                  --help, -h      Show this help message

                Exit codes: 0 = success, 1 = format error, 2 = IO error
                """);
    }

    private static final class Args {
        boolean help;
        boolean stripOnly;
        boolean formatOnly;
        List<String> files = new ArrayList<>();
    }

    private record Result(String path, String formatted, String error) {}
}
