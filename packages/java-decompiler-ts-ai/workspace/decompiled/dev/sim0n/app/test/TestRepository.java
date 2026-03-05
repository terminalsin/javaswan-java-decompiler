package dev.sim0n.app.test;

public class TestRepository {
  private final Runnable runnable;
  private final java.util.List tests;
  
  public TestRepository(Runnable runnable) {
    tmpArray14 = new Test[12];
    tmpArray14[0] = new impl.annotation.AnnotationTest();
    tmpArray14[1] = new impl.flow.OpaqueConditionTest();
    tmpArray14[2] = new impl.flow.WeirdLoopTest();
    tmpArray14[3] = new impl.inheritance.InheritanceTest();
    tmpArray14[4] = new impl.enumtest.EnumConstantsTest();
    tmpArray14[5] = new impl.numbers.NumberComparisonTest();
    tmpArray14[6] = new impl.crypttest.BlowfishTest();
    tmpArray14[7] = new impl.evaluation.EvaluationTest();
    tmpArray14[8] = new impl.visitor.VisitorTest();
    tmpArray14[9] = new impl.fizzbuzz.FizzBuzzTest();
    tmpArray14[10] = new impl.interfaceoverlap.InterfaceOverlapTest();
    tmpArray14[11] = new impl.trycatch.TryCatchTest();
    this.tests = java.util.Arrays.asList(tmpArray14);
    this.runnable = runnable;
  }
  
  public void run() {
    this.runnable.run();
    System.out.println("Running tests");
    this.tests.forEach(Test::run);
  }
}