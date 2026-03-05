package dev.sim0n.app.test.impl.visitor;

public class VisitableApp implements Visitable {
  public void accept(Visitor visitor) {
    visitor.visit(System.out);
  }
}