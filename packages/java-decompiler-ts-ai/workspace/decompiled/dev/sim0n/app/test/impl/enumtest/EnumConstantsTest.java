package dev.sim0n.app.test.impl.enumtest;

public class EnumConstantsTest implements dev.sim0n.app.test.Test {
  public void run() {
    var1 = (EnumConstant[]) EnumConstant.class.getEnumConstants();
    var2 = var1.length;
    while (var3 < var2) {
      EnumConstant constant = var1[var3];
      System.out.println(constant);
      var3++;
    }
  }
}