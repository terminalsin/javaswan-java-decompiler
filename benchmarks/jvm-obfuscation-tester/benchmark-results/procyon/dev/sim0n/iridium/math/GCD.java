package dev.sim0n.iridium.math;

public final class GCD {
  public static double of(final double a, final double b, final double base) {
    if (a < b) {
      return of(b, a, base);
    }
    return (Math.abs(b) < base) ? a : of(b, a - Math.floor(a / b) * b, base);
  }

  private GCD() {
    throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
  }
}
