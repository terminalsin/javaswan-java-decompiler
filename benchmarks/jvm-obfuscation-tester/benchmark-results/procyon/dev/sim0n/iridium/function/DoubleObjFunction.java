package dev.sim0n.iridium.function;

@FunctionalInterface
public interface DoubleObjFunction<T> {
  double apply(final T p0);
}
