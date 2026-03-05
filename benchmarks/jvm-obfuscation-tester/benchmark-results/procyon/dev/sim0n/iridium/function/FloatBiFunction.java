package dev.sim0n.iridium.function;

@FunctionalInterface
public interface FloatBiFunction<T, U> {
  float apply(final T p0, final U p1);
}
