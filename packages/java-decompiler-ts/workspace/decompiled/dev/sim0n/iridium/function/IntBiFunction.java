package dev.sim0n.iridium.function;

@FunctionalInterface
public interface IntBiFunction<T, U> {
  abstract int apply(T arg0, U arg1);
}