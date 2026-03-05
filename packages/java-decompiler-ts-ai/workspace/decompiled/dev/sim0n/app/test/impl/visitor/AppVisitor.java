package dev.sim0n.app.test.impl.visitor;

public class AppVisitor implements Visitor {
  public void visit(java.io.PrintStream printStream) {
    printStream.println("Hello world from Visitor!");
  }
}