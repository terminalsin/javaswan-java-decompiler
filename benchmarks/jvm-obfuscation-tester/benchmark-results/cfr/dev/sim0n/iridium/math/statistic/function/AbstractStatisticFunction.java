package dev.sim0n.iridium.math.statistic.function;

import dev.sim0n.iridium.math.helper.CommonMathFunctions;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;

public abstract class AbstractStatisticFunction implements StatisticFunction, CommonMathFunctions {
  protected boolean biasCorrection = false;

  public <T extends AbstractStatisticFunction> T correctBias() {
    this.biasCorrection = true;
    return (T) this;
  }

  public boolean isBiasCorrection() {
    return this.biasCorrection;
  }
}
