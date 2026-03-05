package dev.sim0n.iridium.function;

@FunctionalInterface
public interface DoubleObjFunction<T> {
  abstract double apply(T arg0);
}
