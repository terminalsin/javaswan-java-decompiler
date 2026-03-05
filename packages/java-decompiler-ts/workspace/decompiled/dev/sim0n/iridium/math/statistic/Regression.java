package dev.sim0n.iridium.math.statistic;

import dev.sim0n.iridium.math.statistic.regression.RegressionResult;
import dev.sim0n.iridium.math.statistic.regression.linear.LinearRegression;
import dev.sim0n.iridium.math.statistic.regression.linear.impl.LeastSquares;

public final class Regression {
  private static final LinearRegression LEAST_SQUARES;
  
  public static RegressionResult leastSquares(double[] x, double[] y) {
    return LEAST_SQUARES.evaluate(x, y);
  }
  
  static {
    LEAST_SQUARES = new LeastSquares();
  }
}