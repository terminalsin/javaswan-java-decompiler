package dev.sim0n.app.test.impl.visitor;

import java.io.PrintStream;

public class AppVisitor implements Visitor {
  public void visit(PrintStream printStream) {
    printStream.println("Hello world from Visitor!");
  }
}
