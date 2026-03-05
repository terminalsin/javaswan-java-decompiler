package dev.sim0n.iridium.function;

@FunctionalInterface
public interface IntObjFunction<T> {
  abstract int apply(T arg0);
}
