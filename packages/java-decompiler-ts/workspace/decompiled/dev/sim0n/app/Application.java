package dev.sim0n.app;

import dev.sim0n.app.test.TestRepository;

public class Application {
  private final TestRepository testRepository;
  
  public void run() {
    System.out.println("Starting application...");
    if (this.fibRecursion(9) != 34) {
      throw new IllegalStateException("Fibonacci sequence is incorrect!");
    }
    this.testRepository.run();
    System.out.println("Successfully passed every test!");
  }
  
  public int fibRecursion(int n) {
    if (n <= 1) {
      return n;
    }
    if (n != 2) {
      return this.fibRecursion(n - 1) + this.fibRecursion(n - 2);
    } else {
      return 1;
    }
  }
}