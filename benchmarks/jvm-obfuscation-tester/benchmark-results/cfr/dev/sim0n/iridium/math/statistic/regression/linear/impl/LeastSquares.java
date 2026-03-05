package dev.sim0n.iridium.math.statistic.regression.linear.impl;

import dev.sim0n.iridium.function.DoubleBiFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.impl.Mean;
import dev.sim0n.iridium.math.statistic.regression.RegressionResult;
import dev.sim0n.iridium.math.statistic.regression.linear.AbstractLinearRegression;
import java.util.Arrays;
import java.util.stream.IntStream;

public class LeastSquares extends AbstractLinearRegression {
  private final StatisticFunction m1 = new Mean();
  private final DoubleBiFunction<double[], Double> squareSumFunc = (array, mean) ->
      Arrays.stream(array).map(value -> this.square(value - mean)).sum();

  @Override
  public RegressionResult evaluate(double[] x, double[] y) {
    if (x.length != y.length) {
      throw new IllegalArgumentException("x and y must be of the same length");
    }
    if (x.length < 2) {
      throw new IllegalArgumentException("x and y must have at least 2 elements");
    }
    int n = x.length;
    double meanX = this.m1.evaluate(x);
    double meanY = this.m1.evaluate(y);
    double squaredDeltaXSum = this.squareSumFunc.apply(x, meanX);
    double squaredDeltaYSum = this.squareSumFunc.apply(y, meanY);
    double squaredDeltaXYSum =
        IntStream.range(0, n).mapToDouble(i -> (x[i] - meanX) * (y[i] - meanY)).sum();
    double slope = squaredDeltaXYSum / squaredDeltaXSum;
    double intercept = meanY - slope * meanX;
    double regressionSum = IntStream.range(0, n)
        .mapToDouble(i -> slope * x[i] + intercept)
        .map(fitY -> this.square(fitY - meanY))
        .sum();
    double r2 = regressionSum / squaredDeltaYSum;
    return new RegressionResult(slope, intercept, r2);
  }
}
