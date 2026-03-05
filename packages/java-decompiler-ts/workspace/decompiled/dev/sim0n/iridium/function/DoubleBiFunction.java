package dev.sim0n.iridium.function;

@FunctionalInterface
public interface DoubleBiFunction<T, U> {
  abstract double apply(T arg0, U arg1);
}