package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.function.DoubleBiFunction;
import dev.sim0n.iridium.function.DoubleObjFunction;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.impl.Mean;
import java.util.Arrays;
import java.util.Optional;

public class Variance extends AbstractStatisticFunction {
  private final StatisticFunction m1 = new Mean();
  private final DoubleObjFunction<double[]> meanEvaluatorFunc = this.m1::evaluate;
  private final DoubleBiFunction<double[], Optional<Double>> innerVarianceFunc =
      (data, meanOpt) -> {
        int n = ((double[]) data).length;
        double mean = meanOpt.orElse(this.meanEvaluatorFunc.apply((double[]) data));
        double variance =
            Arrays.stream(data).map(value -> this.square(value - mean)).sum();
        return variance /= this.biasCorrection ? (double) (n - 1) : (double) n;
      };

  @Override
  public double evaluate(double[] data) {
    return this.innerVarianceFunc.apply(data, Optional.empty());
  }

  @Override
  public double evaluate(double[] data, double mean) {
    return this.innerVarianceFunc.apply(data, Optional.of(mean));
  }
}
