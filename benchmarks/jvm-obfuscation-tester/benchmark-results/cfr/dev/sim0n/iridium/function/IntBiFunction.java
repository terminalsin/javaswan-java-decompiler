package dev.sim0n.iridium.function;

@FunctionalInterface
public interface IntBiFunction<T, U> {
  public int apply(T var1, U var2);
}
