package dev.sim0n.iridium.function;

@FunctionalInterface
public interface FloatObjFunction<T> {
  abstract float apply(T arg0);
}
