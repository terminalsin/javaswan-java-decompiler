package dev.sim0n.iridium.math.helper;

public interface CommonMathFunctions {
  default double sqrt(double value) {
    return Math.sqrt(value);
  }

  default double square(double value) {
    return Math.pow(value, 2.0);
  }

  default double cube(double value) {
    return Math.pow(value, 3.0);
  }

  default double quartic(double value) {
    return Math.pow(value, 4.0);
  }
}
