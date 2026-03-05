package dev.sim0n.app.test.impl.visitor;

public interface Visitable {
  public static final String hello = "";
  
  abstract void accept(Visitor arg0);
}