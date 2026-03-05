package dev.sim0n.iridium.function;

@FunctionalInterface
public interface DoubleObjFunction<T> {
  public double apply(T var1);
}
