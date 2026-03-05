package dev.sim0n.iridium.math.statistic.function;

import dev.sim0n.iridium.math.helper.CommonMathFunctions;

public interface BiStatisticFunction extends CommonMathFunctions {
  double evaluate(double[] var1, double[] var2);
}
