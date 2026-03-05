package dev.sim0n.app.test.impl.numbers;

public class NumberComparisonTest implements dev.sim0n.app.test.Test {
  public void run() {
    tmpArray0 = new int[25];
    tmpArray0[0] = 813;
    tmpArray0[1] = 432;
    tmpArray0[2] = 784;
    tmpArray0[3] = 409;
    tmpArray0[4] = 600;
    tmpArray0[5] = 552;
    tmpArray0[6] = 923;
    tmpArray0[7] = 51;
    tmpArray0[8] = 275;
    tmpArray0[9] = 988;
    tmpArray0[10] = 774;
    tmpArray0[11] = 74;
    tmpArray0[12] = 693;
    tmpArray0[13] = 892;
    tmpArray0[14] = 957;
    tmpArray0[15] = 398;
    tmpArray0[16] = 636;
    tmpArray0[17] = 530;
    tmpArray0[18] = 472;
    tmpArray0[19] = 769;
    tmpArray0[20] = 106;
    tmpArray0[21] = 259;
    tmpArray0[22] = 450;
    tmpArray0[23] = 893;
    tmpArray0[24] = 355;
    int[] intValues = new int[25];
    tmpArray1 = new double[25];
    tmpArray1[0] = 15.354279285687706;
    tmpArray1[1] = 5.797782664265068;
    tmpArray1[2] = 8.683696317015794;
    tmpArray1[3] = 1.9817656768587806;
    tmpArray1[4] = 3.535287429360438;
    tmpArray1[5] = 4.220760053178631;
    tmpArray1[6] = 10.807260410843776;
    tmpArray1[7] = 9.79012425459241;
    tmpArray1[8] = 9.862795945665074;
    tmpArray1[9] = 0.74113233949422;
    tmpArray1[10] = 2.422188626186955;
    tmpArray1[11] = 9.624071224255548;
    tmpArray1[12] = 0.21480131492236743;
    tmpArray1[13] = 10.736554500849767;
    tmpArray1[14] = 2.7573095161824757;
    tmpArray1[15] = 16.295928424685112;
    tmpArray1[16] = 1.5007304056520934;
    tmpArray1[17] = 11.312333434915566;
    tmpArray1[18] = 0.2805255257633217;
    tmpArray1[19] = 2.158320252411026;
    tmpArray1[20] = 0;
    tmpArray1[21] = 8.556101546454709;
    tmpArray1[22] = 1.1028629585647993;
    tmpArray1[23] = 15.846849796405586;
    tmpArray1[24] = 5.932633085882487;
    double[] doubleValues = new double[25];
    double[] randomDoubles = new double[doubleValues.length];
    int i = 0;
    while (i < randomDoubles.length) {
      randomDoubles[i] = Math.random();
      i++;
    }
    i = 0;
    int i = 0;
    while (i < intValues.length) {
      int intValue = intValues[i];
      double doubleValue = doubleValues[i];
      if (Double.compare((double) intValue, doubleValue) <= 0) {
        if (Double.compare((double) intValue, doubleValue) < 0) {
        }
      } else {
        i++;
      }
      i++;
    }
    i = dev.sim0n.iridium.math.statistic.Stats.stdDev(doubleValues);
    doubleValue = dev.sim0n.iridium.math.statistic.Stats.kurtosis(doubleValues);
    System.out.println(new StringBuilder().append("stddev=").append(i).toString());
    System.out.println(new StringBuilder().append("kurtosis=").append(doubleValue).toString());
    System.out.println(new StringBuilder().append("intercept=").append(dev.sim0n.iridium.math.statistic.Regression.leastSquares(doubleValues, randomDoubles).intercept()).toString());
    if (i - intValues.length != 0) {
      throw new IllegalArgumentException(new StringBuilder().append("Failed number comparison test! Occurrences: ").append(i).toString());
    }
  }
}