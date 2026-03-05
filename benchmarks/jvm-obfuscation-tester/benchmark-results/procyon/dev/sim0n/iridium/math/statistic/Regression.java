package dev.sim0n.iridium.math.statistic;

import dev.sim0n.iridium.math.statistic.regression.linear.impl.LeastSquares;
import dev.sim0n.iridium.math.statistic.regression.RegressionResult;
import dev.sim0n.iridium.math.statistic.regression.linear.LinearRegression;

public final class Regression {
  private static final LinearRegression LEAST_SQUARES;

  public static RegressionResult leastSquares(final double[] x, final double[] y) {
    return Regression.LEAST_SQUARES.evaluate(x, y);
  }

  private Regression() {
    throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
  }

  static {
    LEAST_SQUARES = new LeastSquares();
  }
}
