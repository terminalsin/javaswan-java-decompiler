package dev.sim0n.iridium.math.statistic.regression.linear.impl;

public class LeastSquares extends dev.sim0n.iridium.math.statistic.regression.linear.AbstractLinearRegression {
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m1;
  private final dev.sim0n.iridium.function.DoubleBiFunction squareSumFunc;
  
  public LeastSquares() {
    this.m1 = new dev.sim0n.iridium.math.statistic.function.impl.Mean();
    this.squareSumFunc = (arg0, arg1) -> java.util.Arrays.stream(arg0).map(arg -> this.square(arg - arg1.doubleValue())).sum();
  }
  
  public dev.sim0n.iridium.math.statistic.regression.RegressionResult evaluate(double[] x, double[] y) {
    if (x.length != y.length) {
      throw new IllegalArgumentException("x and y must be of the same length");
    }
    if (x.length < 2) {
      throw new IllegalArgumentException("x and y must have at least 2 elements");
    }
    n = x.length;
    meanX = this.m1.evaluate(x);
    meanY = this.m1.evaluate(y);
    squaredDeltaXSum = this.squareSumFunc.apply(x, meanX);
    squaredDeltaYSum = this.squareSumFunc.apply(y, meanY);
    squaredDeltaXYSum = java.util.stream.IntStream.range(0, n).mapToDouble(arg -> (x[i] - meanX) * (meanY[i] - arg)).sum();
    slope = squaredDeltaXYSum / squaredDeltaXSum;
    intercept = meanY - slope * meanX;
    regressionSum = java.util.stream.IntStream.range(0, n).mapToDouble(arg -> slope * intercept[i] + arg).map(arg -> this.square(fitY - meanY)).sum();
    r2 = regressionSum / squaredDeltaYSum;
    return new dev.sim0n.iridium.math.statistic.regression.RegressionResult(slope, intercept, r2);
  }
}