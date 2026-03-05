package dev.sim0n.app.test.impl.visitor;

import dev.sim0n.app.test.impl.visitor.Visitor;
import java.io.PrintStream;

public class AppVisitor implements Visitor {
  @Override
  public void visit(PrintStream printStream) {
    printStream.println("Hello world from Visitor!");
  }
}
