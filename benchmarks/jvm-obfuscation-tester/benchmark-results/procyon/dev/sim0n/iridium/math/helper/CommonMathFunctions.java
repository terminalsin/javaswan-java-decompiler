package dev.sim0n.iridium.math.helper;

public interface CommonMathFunctions {
  default double sqrt(final double value) {
    return Math.sqrt(value);
  }

  default double square(final double value) {
    return Math.pow(value, 2.0);
  }

  default double cube(final double value) {
    return Math.pow(value, 3.0);
  }

  default double quartic(final double value) {
    return Math.pow(value, 4.0);
  }
}
