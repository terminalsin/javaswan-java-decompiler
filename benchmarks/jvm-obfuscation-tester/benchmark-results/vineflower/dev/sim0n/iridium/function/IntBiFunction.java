package dev.sim0n.iridium.function;

@FunctionalInterface
public interface IntBiFunction<T, U> {
  int apply(T var1, U var2);
}
