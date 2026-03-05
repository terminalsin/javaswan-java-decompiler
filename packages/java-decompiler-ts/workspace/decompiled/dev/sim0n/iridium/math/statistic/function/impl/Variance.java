package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.function.DoubleBiFunction;
import dev.sim0n.iridium.function.DoubleObjFunction;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import java.util.Objects;
import java.util.Optional;

public class Variance extends AbstractStatisticFunction {
  private final StatisticFunction m1;
  private final DoubleObjFunction<double[]> meanEvaluatorFunc;
  private final DoubleBiFunction<double[], Optional<Double>> innerVarianceFunc;
  
  public Variance() {
    this.m1 = new Mean();
    Objects.requireNonNull(this.m1);
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
    return this.innerVarianceFunc.apply(data, Optional.empty());
  }
  
  public double evaluate(double[] data, double mean) {
    return this.innerVarianceFunc.apply(data, Optional.of(mean));
  }
}