package dev.sim0n.iridium.function;

@FunctionalInterface
public interface FloatBiFunction<T, U> {
  float apply(T var1, U var2);
}
