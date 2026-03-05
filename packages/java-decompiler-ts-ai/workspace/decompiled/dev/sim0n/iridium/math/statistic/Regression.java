package dev.sim0n.iridium.math.statistic;

public final class Regression {
  private static final regression.linear.LinearRegression LEAST_SQUARES;
  
  public static regression.RegressionResult leastSquares(double[] x, double[] y) {
    return LEAST_SQUARES.evaluate(x, y);
  }
  
  static {
    LEAST_SQUARES = new regression.linear.impl.LeastSquares();
  }
}