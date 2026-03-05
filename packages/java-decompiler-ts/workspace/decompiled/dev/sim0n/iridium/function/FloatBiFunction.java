package dev.sim0n.iridium.function;

@FunctionalInterface
public interface FloatBiFunction<T, U> {
  abstract float apply(T arg0, U arg1);
}