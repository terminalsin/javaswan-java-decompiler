package dev.sim0n.iridium.math;

public final class GCD {
  public static double of(double a, double b, double base) {
    if (Double.compare(a, b) < 0) {
      return GCD.of(b, a, base);
    }
    if (Double.compare(Math.abs(b), base) >= 0) {
      return a;
    } else {
      return a;
    }
  }
}