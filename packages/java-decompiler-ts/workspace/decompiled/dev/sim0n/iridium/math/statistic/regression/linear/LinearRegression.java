package dev.sim0n.iridium.math.statistic.regression.linear;

import dev.sim0n.iridium.math.statistic.regression.RegressionResult;

public interface LinearRegression {
  abstract RegressionResult evaluate(double[] arg0, double[] arg1);
}