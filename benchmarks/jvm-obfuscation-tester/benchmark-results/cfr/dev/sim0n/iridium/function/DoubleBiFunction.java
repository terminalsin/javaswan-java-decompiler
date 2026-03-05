package dev.sim0n.iridium.function;

@FunctionalInterface
public interface DoubleBiFunction<T, U> {
  public double apply(T var1, U var2);
}
