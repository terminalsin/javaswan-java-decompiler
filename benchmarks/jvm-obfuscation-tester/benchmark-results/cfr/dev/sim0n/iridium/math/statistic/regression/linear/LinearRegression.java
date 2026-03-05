package dev.sim0n.iridium.math.statistic.regression.linear;

import dev.sim0n.iridium.math.statistic.regression.RegressionResult;

public interface LinearRegression {
  public RegressionResult evaluate(double[] var1, double[] var2);
}
