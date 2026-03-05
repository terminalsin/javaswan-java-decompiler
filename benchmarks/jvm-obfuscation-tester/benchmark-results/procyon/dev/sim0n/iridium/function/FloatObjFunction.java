package dev.sim0n.iridium.function;

@FunctionalInterface
public interface FloatObjFunction<T> {
  float apply(final T p0);
}
