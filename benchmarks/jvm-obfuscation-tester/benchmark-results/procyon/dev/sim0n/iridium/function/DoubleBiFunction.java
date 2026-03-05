package dev.sim0n.iridium.function;

@FunctionalInterface
public interface DoubleBiFunction<T, U> {
  double apply(final T p0, final U p1);
}
