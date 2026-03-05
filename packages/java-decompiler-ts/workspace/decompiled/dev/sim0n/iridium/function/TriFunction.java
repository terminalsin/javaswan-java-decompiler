package dev.sim0n.iridium.function;

@FunctionalInterface
public interface TriFunction<T, U, V, R> {
  abstract R apply(T arg0, U arg1, V arg2);
}