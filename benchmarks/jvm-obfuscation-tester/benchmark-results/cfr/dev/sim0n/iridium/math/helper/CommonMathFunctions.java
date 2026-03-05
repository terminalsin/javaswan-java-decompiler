package dev.sim0n.iridium.math.helper;

public interface CommonMathFunctions {
  public default double sqrt(double value) {
    return Math.sqrt(value);
  }

  public default double square(double value) {
    return Math.pow(value, 2.0);
  }

  public default double cube(double value) {
    return Math.pow(value, 3.0);
  }

  public default double quartic(double value) {
    return Math.pow(value, 4.0);
  }
}
