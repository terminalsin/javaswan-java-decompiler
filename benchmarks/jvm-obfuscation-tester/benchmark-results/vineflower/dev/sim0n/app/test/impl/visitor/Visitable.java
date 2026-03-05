package dev.sim0n.app.test.impl.visitor;

public interface Visitable {
  String hello = "";

  void accept(Visitor var1);
}
