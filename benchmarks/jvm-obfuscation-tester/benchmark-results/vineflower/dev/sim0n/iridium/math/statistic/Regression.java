package dev.sim0n.iridium.math.statistic;

import dev.sim0n.iridium.math.statistic.regression.RegressionResult;
import dev.sim0n.iridium.math.statistic.regression.linear.LinearRegression;
import dev.sim0n.iridium.math.statistic.regression.linear.impl.LeastSquares;

public final class Regression {
  private static final LinearRegression LEAST_SQUARES = new LeastSquares();

  public static RegressionResult leastSquares(double[] x, double[] y) {
    return LEAST_SQUARES.evaluate(x, y);
  }

  private Regression() {
    throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
  }
}
