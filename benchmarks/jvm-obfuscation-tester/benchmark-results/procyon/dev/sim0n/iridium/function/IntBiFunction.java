package dev.sim0n.iridium.function;

@FunctionalInterface
public interface IntBiFunction<T, U> {
  int apply(final T p0, final U p1);
}
