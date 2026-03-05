package dev.sim0n.iridium.math.statistic.regression;

public class RegressionResult {
  private final double slope;
  private final double intercept;
  private final double r2;

  public double slope() {
    return this.slope;
  }

  public double intercept() {
    return this.intercept;
  }

  public double determination() {
    return this.r2;
  }

  public RegressionResult(double slope, double intercept, double r2) {
    this.slope = slope;
    this.intercept = intercept;
    this.r2 = r2;
  }
}
