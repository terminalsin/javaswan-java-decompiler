package dev.sim0n.iridium.function;

@FunctionalInterface
public interface TriFunction<T, U, V, R> {
  public R apply(T var1, U var2, V var3);
}
