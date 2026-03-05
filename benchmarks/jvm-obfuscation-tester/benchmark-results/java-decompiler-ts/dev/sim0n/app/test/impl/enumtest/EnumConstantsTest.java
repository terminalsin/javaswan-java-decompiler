package dev.sim0n.app.test.impl.enumtest;

import dev.sim0n.app.test.Test;

public class EnumConstantsTest implements Test {
  public void run() {
    EnumConstant[] var1 = (EnumConstant[]) EnumConstant.class.getEnumConstants();
    int var2 = var1.length;
    for (int var3 = 0; var3 < var2; var3++) {
      EnumConstant constant = var1[var3];
      System.out.println(constant);
    }
  }
}
