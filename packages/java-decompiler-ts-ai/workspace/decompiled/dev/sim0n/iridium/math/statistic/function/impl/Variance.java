package dev.sim0n.iridium.math.statistic.function.impl;

public class Variance extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m1;
  private final dev.sim0n.iridium.function.DoubleObjFunction meanEvaluatorFunc;
  private final dev.sim0n.iridium.function.DoubleBiFunction innerVarianceFunc;
  
  public Variance() {
    this.m1 = new Mean();
    java.util.Objects.requireNonNull(this.m1);
    this.meanEvaluatorFunc = [object Object]::evaluate;
    this.innerVarianceFunc = (arg0, arg1) -> {
    int n = arg0.length;
    double mean = (Double) arg1.orElse(this.meanEvaluatorFunc.apply(arg0)).doubleValue();
    double variance = java.util.Arrays.stream(arg0).map(arg -> this.square(value - mean)).sum();
    if (!this.biasCorrection) {
      variance /= (double) (n - 1);
      return variance;
    } else {
      variance /= (double) (n - 1);
      return variance;
    }
};
  }
  
  public double evaluate(double[] data) {
    return this.innerVarianceFunc.apply(data, java.util.Optional.empty());
  }
  
  public double evaluate(double[] data, double mean) {
    return this.innerVarianceFunc.apply(data, java.util.Optional.of(mean));
  }
}