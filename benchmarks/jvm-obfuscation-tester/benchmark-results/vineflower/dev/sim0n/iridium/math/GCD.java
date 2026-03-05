package dev.sim0n.iridium.math;

public final class GCD {
  public static double of(double a, double b, double base) {
    if (a < b) {
      return of(b, a, base);
    } else {
      return Math.abs(b) < base ? a : of(b, a - Math.floor(a / b) * b, base);
    }
  }

  private GCD() {
    throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
  }
}
